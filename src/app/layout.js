export default function RootLayout({ children }) {
return (
<html lang="en">
<body style={{ margin: 0, background: "#0B0B0B", color: "#fff", fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto" }}>
{children}
</body>
</html>
);
}