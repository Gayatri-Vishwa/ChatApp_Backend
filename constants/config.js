//  const corsOptions={
//   // origin: ["http://localhost:5173","http://localhost:4173",process.env.CLIENT_URL],
//   origin: ["http://localhost:5173","http://localhost:4173",  "https://chat-app-frontend-dsux.vercel.app"],
//   methods:["GET","POST","PUT","DELETE"],
//   credentials: true,
// }



const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://chat-app-frontend-dsux.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

const CHATTU_TOKEN="chattu-token"

export {corsOptions,CHATTU_TOKEN}