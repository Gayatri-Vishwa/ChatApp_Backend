import { envMode } from "../app.js";

const errorMiddleware = (err, req, res, next) => {

    console.log("==========ERROR==========");
  console.log(err);
  console.log("err.message =", err.message);
  console.log("typeof =", typeof err.message);


  err.message = err.message || "Internal server Error";
  err.statusCode ||= 500;


  //duplicate username
  if (err.code === 11000) {
    const error = Object.keys(err.keyPattern).join(",");
    err.message = `Duplicate Field -${error}`;
    err.statusCode = 400;
  }

  if (err.name === "CastError") {
    const errorPath = err.path;
    // err.message=`Invalid Format of ${errorPath}`,
    err.statusCode = 400;

    //   err.message=`Invalid Format of ${errorPath}`,

    if (envMode !== "DEVELOPMENT") {
      err.message = `Invalid Format of ${err.path}`;
    }
  }

  // return res.status(err.statusCode).json({
  //   success: false,
  //   message: envMode === "DEVELOPMENT" ? err : err.message,
  // });

  return res.status(err.statusCode).json({
  success: false,
   message: err.message || "Something went wrong",  // ALWAYS STRING
});

};

//this will retrun arrow func
const tryCatch = (passedFunc) => async (req, res, next) => {
  try {
    await passedFunc(req, res, next);
  } catch (error) {
    // throw error
     console.log("ERROR OCCURRED:");
     console.error(error);
    next(error);
  }
};

export { errorMiddleware, tryCatch };

