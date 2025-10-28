const express = require("express");
const fs = require("fs");
const { supabase } = require("../integrations/supabase/client");
const { ORDERS_FILE } = require("../config");

const router = express.Router();

// --- ONE-TIME MIGRATION LOGIC ---
let migrationAttempted = false;
async function migrateOrdersToSupabase() {
    if (migrationAttempted) return;
    migrationAttempted = true;

    try {
        console.log("Checking if orders migration is needed...");

        const { count, error: countError } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error("❌ Supabase count error:", countError.message);
            return;
        }

        if (!fs.existsSync(ORDERS_FILE)) {
            console.log("⏭️ JSON file not found, skipping migration.");
            return;
        }
        const jsonData = fs.readFileSync(ORDERS_FILE, "utf8");
        const oldOrders = JSON.parse(jsonData);

        if (oldOrders.length === 0) {
            console.log("⏭️ JSON file is empty, skipping migration.");
            fs.renameSync(ORDERS_FILE, `${ORDERS_FILE}.migrated`);
            return;
        }
        
        if (count === 0 && oldOrders.length > 0) {
            console.log(`🚚 Migrating ${oldOrders.length} orders from JSON to Supabase...`);

            const ordersToInsert = oldOrders.map(order => {
                const { id, date, time, ...rest } = order;
                if (rest.rawDate) {
                    rest.raw_date = new Date(rest.rawDate).toISOString();
                    delete rest.rawDate;
                }
                return rest;
            });

            const { error: insertError } = await supabase
                .from('orders')
                .insert(ordersToInsert);

            if (insertError) {
                console.error("❌ Migration insert error:", insertError.message);
            } else {
                console.log("✅ Migration successful!");
                fs.renameSync(ORDERS_FILE, `${ORDERS_FILE}.migrated`);
                console.log(`📦 Renamed old orders file to ${ORDERS_FILE}.migrated`);
            }
        } else {
            console.log(`⏭️ Skipping migration. Supabase orders: ${count}, JSON orders: ${oldOrders.length}.`);
            if (fs.existsSync(ORDERS_FILE)) {
                 fs.renameSync(ORDERS_FILE, `${ORDERS_FILE}.migrated`);
                 console.log(`📦 Renamed old orders file to ${ORDERS_FILE}.migrated to prevent conflicts.`);
            }
        }
    } catch (error) {
        console.error("❌ An error occurred during the migration check:", error.message);
    }
}
// --- END OF MIGRATION LOGIC ---

// Get all orders
router.get("/orders", async (req, res) => {
    if (!migrationAttempted) {
        await migrateOrdersToSupabase();
    }

    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('raw_date', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error("❌ Error reading orders from Supabase:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add new orders
router.post("/orders", async (req, res) => {
    try {
        const newOrders = req.body;
        if (!Array.isArray(newOrders)) {
            return res.status(400).json({ success: false, error: "Request body must be an array of orders." });
        }

        const ordersToInsert = newOrders.map(order => {
            const { id, date, time, ...rest } = order;
             if (rest.rawDate) {
                rest.raw_date = rest.rawDate;
                delete rest.rawDate;
            }
            return rest;
        });

        const { data, error } = await supabase
            .from('orders')
            .insert(ordersToInsert)
            .select();

        if (error) throw error;

        console.log(`✅ ${data.length} new order(s) saved successfully to Supabase.`);
        res.json({ success: true, message: "Orders saved successfully" });
    } catch (error) {
        console.error("❌ Error saving orders to Supabase:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete an order
router.delete("/orders/:id", async (req, res) => {
    try {
        const orderIdToDelete = req.params.id;

        const { error } = await supabase
            .from('orders')
            .delete()
            .match({ id: orderIdToDelete });

        if (error) throw error;

        console.log(`🗑️ Order with ID ${orderIdToDelete} deleted successfully from Supabase.`);
        res.json({ success: true, message: "Order deleted successfully" });
    } catch (error) {
        console.error(`❌ Error deleting order with ID ${req.params.id} from Supabase:`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;