import { db } from "hatchable";

export const access="public";
export const methods=["GET"];

export default async function(req,res){
  const [categories,bins,rewards,stats]=await Promise.all([
    db.query("SELECT id,name,description,points FROM waste_categories WHERE is_active=true ORDER BY name"),
    db.query("SELECT id,name,description,latitude,longitude FROM waste_bins WHERE is_active=true ORDER BY name"),
    db.query("SELECT id,name,description,point_cost,stock,category,(image_key IS NOT NULL) has_image FROM rewards WHERE is_active=true ORDER BY point_cost,name"),
    db.query("SELECT (SELECT COUNT(*) FROM eco_profiles)::int users,(SELECT COUNT(*) FROM waste_reports)::int reports,(SELECT COUNT(*) FROM waste_reports WHERE status='approved')::int approved,(SELECT COALESCE(SUM(points),0) FROM point_transactions WHERE points>0)::int points")
  ]);
  res.json({categories:categories.rows,locations:bins.rows,rewards:rewards.rows,stats:stats.rows[0]});
}