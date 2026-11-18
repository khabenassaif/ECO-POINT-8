import { db } from "hatchable";

export async function requireAllowedUser(req, res) {
  const user = req.user;
  const email = String(user?.email || "").toLowerCase().trim();
  if (!email || !email.includes("@")) {
    res.status(403).json({ error: "institutional_email_required" });
    return null;
  }

  const domains = await db.query("SELECT domain FROM allowed_email_domains ORDER BY domain");
  const domain = email.split("@").pop();

  // Setup mode: while no institutional domain has been configured yet,
  // authenticated end users are allowed through so the owner can test and
  // operate the app. The moment at least one domain is added in Admin
  // Settings, institutional-domain enforcement becomes active automatically.
  if (domains.rows.length && !domains.rows.some(r => String(r.domain).toLowerCase() === domain)) {
    res.status(403).json({
      error: "domain_not_allowed",
      message: "Gunakan akun email institusi yang diizinkan."
    });
    return null;
  }

  const existing = await db.query("SELECT * FROM eco_profiles WHERE user_id=$1", [user.id]);
  if (!existing.rows.length) {
    const created = await db.query(
      "INSERT INTO eco_profiles (user_id,full_name,email) VALUES ($1,$2,$3) RETURNING *",
      [user.id, user.name || email.split("@")[0], email]
    );
    return { user, profile: created.rows[0] };
  }
  return { user, profile: existing.rows[0] };
}

export async function getBalance(userId) {
  const r = await db.query(
    "SELECT COALESCE(SUM(points),0)::int AS balance FROM point_transactions WHERE user_id=$1",
    [userId]
  );
  return Number(r.rows[0]?.balance || 0);
}