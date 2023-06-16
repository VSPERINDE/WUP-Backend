const mongoose = require("mongoose");
const MONGODB_URI =
  "mongodb+srv://sperindevitor:S0aQaASZHwiRjSNp@wup.vxysylq.mongodb.net/?retryWrites=true&w=majority";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB is Up!"))
  .catch((err) => console.log(err));
