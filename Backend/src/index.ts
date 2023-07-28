
import Server from "./server";
import config  from "./config/configLocal";
const port = parseInt(config.PORT ?? "9000");
console.log("port is  =>", port);
Server.listen(port);
