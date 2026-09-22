import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pool from "../config/db.js";

dotenv.config();

const authMiddleware = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Login required.",
      });
    }

    const token = authorization.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (verifyError) {
      // If token is simply expired, check if it was authentic and user still exists
      if (verifyError.name === "TokenExpiredError") {
        try {
          const expiredPayload = jwt.verify(token, process.env.JWT_SECRET, {
            ignoreExpiration: true,
          });

          if (expiredPayload && expiredPayload.id) {
            const [users] = await pool.execute(
              "SELECT u_id AS id, account_type AS accountType FROM users WHERE u_id = ?",
              [expiredPayload.id]
            );

            if (users.length > 0) {
              const activeUser = users[0];
              const newToken = jwt.sign(
                {
                  id: activeUser.id,
                  accountType: activeUser.accountType,
                },
                process.env.JWT_SECRET,
                {
                  expiresIn: "30d",
                }
              );

              res.setHeader("X-Refreshed-Token", newToken);
              res.setHeader("Access-Control-Expose-Headers", "X-Refreshed-Token");
              req.user = {
                id: activeUser.id,
                accountType: activeUser.accountType,
              };

              return next();
            }
          }
        } catch {
          // Token signature failed or tamper detected
        }
      }

      return res.status(401).json({
        message: "Invalid or expired token.",
      });
    }
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};

export default authMiddleware;