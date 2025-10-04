export default function Head() {
const domain = process.env.NEXT_PUBLIC_APP_DOMAIN || "";
const meta = {
version: "1",
imageUrl: `${domain}/og.png`,
button: {
title: "Play EmojiLock",
action: {
type: "launch_miniapp",
url: domain,
name: "EmojiLock",
splashImageUrl: `${domain}/icon.png`,
splashBackgroundColor: "#0B0B0B"
}
}
};
return (
<>
<title>EmojiLock</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="fc:miniapp" content={JSON.stringify(meta)} />
<meta name="fc:frame" content={JSON.stringify(meta)} />
</>
);
}