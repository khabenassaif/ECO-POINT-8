import { db } from "../../../render-server/sdk.js";
import { requireAllowedUser,getBalance } from "../../lib/user-access.js";
export const access="user";
export const methods=["GET"];
export default async function(req,res){
 const ctx=await requireAllowedUser(req,res);if(!ctx)return;
 const uid=ctx.user.id;
 const rankings=(await db.query("SELECT * FROM eco_contest_leaderboard()")).rows;
 const index=rankings.findIndex(r=>r.user_id===uid);
 const row=index>=0?rankings[index]:null;
 res.json({rank:index>=0?index+1:null,earned_points:Number(row?.total_points||0),approved_reports:Number(row?.approved_reports||0),wallet_points:await getBalance(uid),is_top3:index>=0&&index<3});
}