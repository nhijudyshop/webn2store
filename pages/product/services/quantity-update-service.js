import { tposRequest } from '../../shared/api/tpos-api.js';

/**
 * Run the 3-step flow to update variant quantities in TPOS.
 * - DefaultGetAll (get template by ProductTmplId)
 * - PostChangeQtyProduct (send edited NewQuantity)
 * - ChangeProductQtyIds (confirm using returned ids)
 */
export async function updateVariantQuantitiesIfChanged(productTmplId, changedMap) {
  // Step 1: get template payload
  const template = await tposRequest(
    "https://tomato.tpos.vn/odata/StockChangeProductQty/ODataService.DefaultGetAll?$expand=ProductTmpl,Product,Location",
    { method: "POST", body: { model: { ProductTmplId: productTmplId } } }
  );

  const model = template?.model || template?.value || [];
  if (!Array.isArray(model) || model.length === 0) {
    throw new Error("Không nhận được payload mẫu đổi số lượng từ TPOS.");
  }

  // Map only changed items with safe numeric values
  const updatedModel = model.map(item => {
    const newQty = changedMap[item.ProductId];
    if (newQty !== undefined) {
      return { ...item, NewQuantity: Number.isFinite(newQty) ? newQty : 0 };
    }
    return item;
  }).filter(item => item.NewQuantity !== undefined);

  if (!updatedModel.length) {
    return; // nothing to update
  }

  // Step 2: post changed rows
  const postResp = await tposRequest(
    "https://tomato.tpos.vn/odata/StockChangeProductQty/ODataService.PostChangeQtyProduct?$expand=ProductTmpl,Product,Location",
    { method: "POST", body: { model: updatedModel } }
  );

  // Collect ids from response
  const src = postResp?.value || postResp?.model || postResp;
  const ids = Array.isArray(src) ? src.map(x => x?.Id).filter(Boolean) : (src?.ids || []);
  if (!ids.length) {
    throw new Error("Không lấy được danh sách Id để xác nhận đổi số lượng.");
  }

  // Step 3: confirm by ids
  await tposRequest(
    "https://tomato.tpos.vn/odata/StockChangeProductQty/ODataService.ChangeProductQtyIds",
    { method: "POST", body: { ids } }
  );
}