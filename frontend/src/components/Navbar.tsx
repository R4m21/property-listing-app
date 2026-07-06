import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="navbar-mark">EG</span>
          <span>Estate&nbsp;Grove</span>
        </Link>

        <nav className="navbar-links">
          <Link to="/">Browse</Link>
          {user?.role === "agent" && (
            <>
              <Link to="/add-property">Add property</Link>
              <Link to="/dashboard">Dashboard</Link>
            </>
          )}
        </nav>

        <div className="navbar-actions">
          {user ? (
            <>
              <span className="navbar-user">
                {user.name} <span className="navbar-role">· {user.role}</span>
              </span>
              <button className="btn btn-outline btn-sm" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">
                Log in
              </Link>
              <Link to="/register" className="btn btn-accent btn-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
