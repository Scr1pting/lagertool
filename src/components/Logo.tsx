import { Link } from "react-router-dom";

export default function Logo() {
  return (
    <Link to="/" aria-label="Home">
      <img
        style={{ width: "30px", marginRight: "50px", cursor: "pointer" }}
        src="/logo.webp"
        alt="Viscon logo"
      />
    </Link>
  );
}
