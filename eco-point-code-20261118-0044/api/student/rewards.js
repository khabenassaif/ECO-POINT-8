import { db } from "../../../render-server/sdk.js";
import { requireAllowedUser, getBalance } from "../../lib/user-access.js";

export const access="user";
export const methods=["GET"];

export default async function(req,res){
  const ctx=await requireAllowedUser(req,res); if(!ctx) return;
  const rows=(await db.query("SELECT id,name,description,point_cost,stock,is_active,category,pickup_instructions,(image_key IS NOT NULL) has_image FROM rewards WHERE is_active=true ORDER BY point_cost,name")).rows;
  res.json({points:await getBalance(ctx.user.id),rewards:rows});
}