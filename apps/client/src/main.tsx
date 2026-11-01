import {render} from "ink";
import {App} from "./App";

function serverFromArgs(args: string[]): string {
    const flag = args.indexOf("--server");
    return (flag >= 0 ? args[flag + 1] : undefined) ?? process.env["UNO_SERVER"] ?? "http://localhost:8787";
}

render(<App server={serverFromArgs(process.argv.slice(2))} />, {alternateScreen: true, incrementalRendering: true});
