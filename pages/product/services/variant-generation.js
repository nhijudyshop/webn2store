// pages/product/services/variant-generation.js

import { variantData } from '../variant-editor.js';

function getAttributeId(category) {
    switch (category) {
        case 'colors': return 3;
        case 'letterSizes': return 1;
        case 'numberSizes': return 4;
        default: return 0;
    }
}

export function buildAttributeLines(state) {
    const attributeLines = [];
    const { selectedVariants, variantSelectionOrder } = state;

    for (const category of variantSelectionOrder) {
        const selectedSet = selectedVariants[category];
        if (selectedSet.size > 0) {
            const attributeId = getAttributeId(category);
            const values = [...selectedSet].map(name => {
                return variantData[category].find(v => v.Name === name);
            }).filter(Boolean);

            if (values.length > 0) {
                attributeLines.push({
                    Attribute: { Id: attributeId },
                    Values: values,
                    AttributeId: attributeId
                });
            }
        }
    }
    return attributeLines;
}

function cartesian(...args) {
    const r = [], max = args.length - 1;
    function helper(arr, i) {
        for (let j = 0, l = args[i].length; j < l; j++) {
            const a = arr.slice(0);
            a.push(args[i][j]);
            if (i === max)
                r.push(a);
            else
                helper(a, i + 1);
        }
    }
    helper([], 0);
    return r;
}

export function buildProductVariants(productName, listPrice, state) {
    const { selectedVariants, variantSelectionOrder } = state;

    const variantGroups = variantSelectionOrder
        .map(category => [...selectedVariants[category]])
        .filter(group => group.length > 0);

    if (variantGroups.length === 0) return [];

    const combinations = cartesian(...variantGroups);

    return combinations.map(combo => {
        const variantName = `${productName} (${combo.join(', ')})`;
        const attributeValues = combo.map(valueName => {
            for (const category of variantSelectionOrder) {
                const variant = variantData[category].find(v => v.Name === valueName);
                if (variant) return variant;
            }
            return null;
        }).filter(Boolean);

        return {
            Id: 0, EAN13: null, DefaultCode: null, NameTemplate: productName, NameNoSign: null, ProductTmplId: 0, UOMId: 0, UOMName: null, UOMPOId: 0, QtyAvailable: 0, VirtualAvailable: 0, OutgoingQty: null, IncomingQty: null, NameGet: variantName, POSCategId: null, Price: null, Barcode: null, Image: null, ImageUrl: null, Thumbnails: [], PriceVariant: listPrice, SaleOK: true, PurchaseOK: true, DisplayAttributeValues: null, LstPrice: 0, Active: true, ListPrice: 0, PurchasePrice: null, DiscountSale: null, DiscountPurchase: null, StandardPrice: 0, Weight: 0, Volume: null, OldPrice: null, IsDiscount: false, ProductTmplEnableAll: false, Version: 0, Description: null, LastUpdated: null, Type: "product", CategId: 0, CostMethod: null, InvoicePolicy: "order", Variant_TeamId: 0, Name: variantName, PropertyCostMethod: null, PropertyValuation: null, PurchaseMethod: "receive", SaleDelay: 0, Tracking: null, Valuation: null, AvailableInPOS: true, CompanyId: null, IsCombo: null, NameTemplateNoSign: productName, TaxesIds: [], StockValue: null, SaleValue: null, PosSalesCount: null, Factor: null, CategName: null, AmountTotal: null, NameCombos: [], RewardName: null, Product_UOMId: null, Tags: null, DateCreated: null, InitInventory: 0, OrderTag: null, StringExtraProperties: null, CreatedById: null, TaxAmount: null, Error: null,
            AttributeValues: attributeValues
        };
    });
}