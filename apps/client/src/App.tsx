import {useEffect, useState} from "react";
import {Box, useApp} from "ink";
import {tierFor} from "./art/size";
import {createRoom} from "./net/api";
import {loadSession, type Session} from "./net/session";
import {useRoom, type RoomTarget} from "./net/useRoom";
import {Create} from "./screens/Create";
import {Join} from "./screens/Join";
import {Room} from "./screens/Room";
import {Start} from "./screens/Start";
import {TooSmall} from "./ui/TooSmall";
import {useTerminalSize} from "./ui/useTerminalSize";

type Screen = "start" | "create" | "join" | "room";

export function App({server}: {server: string}) {
    const {exit} = useApp();
    const size = useTerminalSize();
    const [screen, setScreen] = useState<Screen>("start");
    const [name, setName] = useState("");
    const [saved, setSaved] = useState<Session | null>(null);
    const [target, setTarget] = useState<RoomTarget | null>(null);
    const room = useRoom(server, target);

    useEffect(() => {
        void loadSession().then((session) => {
            if (session && session.server === server) {
                setSaved(session);
                setName((current) => current || session.name);
            }
        });
    }, [server]);

    const enterRoom = (next: RoomTarget) => {
        setTarget(next);
        setScreen("room");
    };

    const leaveRoom = () => {
        setTarget(null);
        setScreen("start");
        void loadSession().then(setSaved);
    };

    const tier = tierFor(size.columns, size.rows);
    if (!tier) {
        return <TooSmall size={size} />;
    }

    return (
        <Box width={size.columns} height={size.rows} flexDirection="column" overflow="hidden">
            {screen === "start" ? (
                <Start
                    name={name}
                    onName={setName}
                    saved={saved}
                    onChoose={(choice) => {
                        if (choice === "quit") {
                            exit();
                        } else if (choice === "resume" && saved) {
                            enterRoom({roomKey: saved.roomKey, token: saved.token, name: name.trim()});
                        } else if (choice === "create" || choice === "join") {
                            setScreen(choice);
                        }
                    }}
                />
            ) : screen === "create" ? (
                <Create
                    onBack={() => setScreen("start")}
                    onCreate={async (handSize) => {
                        const created = await createRoom(server, handSize);
                        enterRoom({roomKey: created.roomKey, token: created.token, name: name.trim()});
                    }}
                />
            ) : screen === "join" ? (
                <Join
                    onBack={() => setScreen("start")}
                    onJoin={(roomKey) => enterRoom({roomKey, name: name.trim()})}
                />
            ) : (
                <Room state={room.state} send={room.send} tier={tier} size={size} onLeave={leaveRoom} />
            )}
        </Box>
    );
}
