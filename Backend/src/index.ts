
import Server from "./server";
const port = parseInt(process.env.PORT ?? "9000");
console.log("port is  =>", port);
Server.listen(port);
