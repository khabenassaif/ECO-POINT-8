import { db } from "../../../render-server/sdk.js";
import { requireEcoAdmin } from "../../lib/admin-access.js";

export const access="public";
export const methods=["POST"];

const allowed=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const messages={
 invalid_decision:"Keputusan tidak valid.",
 missing_operator:"Sesi administrator tidak dikenali. Masuk kembali.",
 reason_required:"Alasan penolakan wajib diisi.",
 not_found:"Laporan tidak ditemukan. Muat ulang daftar laporan.",
 already_reviewed:"Laporan ini sudah memiliki keputusan. Muat ulang daftar untuk melihat status terbaru.",
 invalid_status:"Status laporan belum siap diputuskan.",
 invalid_points:"Poin kategori tidak valid. Poin harus berada di antara 5–10."
};

export default async function(req,res){
 if(!await requireEcoAdmin(req,res))return;
 const reportId=String(req.body?.report_id||"").trim();
 const decision=String(req.body?.decision||"").trim();
 const reason=String(req.body?.reason||"").trim().slice(0,1200);
 if(!allowed.test(reportId))return res.status(400).json({error:"ID laporan tidak valid."});
 if(!["approved","rejected"].includes(decision))return res.status(400).json({error:messages.invalid_decision});
 if(decision==="rejected"&&!reason)return res.status(400).json({error:messages.reason_required});
 try{
  // A database function locks the report, records the decision, awards points
  // exactly once and creates the notification in one atomic transaction.
  // It is called only after requireEcoAdmin verifies the server-side session.
  const query=await db.query(
   "SELECT eco_admin_decide_report($1::uuid,$2::text,$3::text,$4::text) AS outcome",
   [reportId,decision,reason,String(req.ecoAdminUsername||"")]
  );
  let outcome=query.rows?.[0]?.outcome;
  if(typeof outcome==="string")outcome=JSON.parse(outcome);
  if(!outcome?.ok){
   const type=outcome?.code||"unknown";
   const status=type==="not_found"?404:
    ["invalid_decision","reason_required","missing_operator"].includes(type)?400:409;
   return res.status(status).json({
    error:messages[type]||"Keputusan belum dapat disimpan. Silakan muat ulang.",
    code:type
   });
  }
  return res.json({
   ok:true,
   status:outcome.status,
   awarded_points:Number(outcome.awarded_points)||0,
   report_id:reportId
  });
 }catch(error){
  console.error("eco_admin_decide_report transaction failed:",String(error?.message||error).slice(0,800));
  return res.status(500).json({
   error:"Terjadi masalah ketika menyimpan keputusan dan poin. Tidak ada poin yang ditambahkan sebagian. Silakan coba lagi.",
   code:"review_transaction_failed"
  });
 }
}