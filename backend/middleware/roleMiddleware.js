const allowRoles = (...roles) => {
    return (req, res, next) => {
      if (!roles.includes(req.user.accountType)) {
        return res.status(403).json({
          message: "You do not have permission.",
        });
      }
  
      next();
    };
  };
  
  export default allowRoles;