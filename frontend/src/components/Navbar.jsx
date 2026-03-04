// frontend/src/components/Navbar.jsx
import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

const Navbar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow">
      <div className="container">
        <Link className="navbar-brand fw-bold fs-4" to="/">🩺 MediConnect</Link>

        <button className="navbar-toggler" type="button"
          data-bs-toggle="collapse" data-bs-target="#navbarMain">
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="navbarMain">
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 gap-1">
            {user ? (
              <>
                <li className="nav-item">
                  <NavLink to={user.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard'}
                           className="nav-link">🏠 Dashboard</NavLink>
                </li>

                {user.role === 'doctor' && (
                  <>
                    <li className="nav-item">
                      <NavLink to="/doctor/appointments" className="nav-link">📅 Appointments</NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink to="/doctor/prescription" className="nav-link">💊 Prescriptions</NavLink>
                    </li>
                  </>
                )}

                {user.role === 'patient' && (
                  <>
                    <li className="nav-item">
                      <NavLink to="/patient/appointments"  className="nav-link">📅 Book</NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink to="/patient/consultations" className="nav-link">📹 Consultations</NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink to="/patient/prescriptions" className="nav-link">💊 Prescriptions</NavLink>
                    </li>
                  </>
                )}

                <li className="nav-item dropdown">
                  <a className="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
                    👤 {user.name}
                  </a>
                  <ul className="dropdown-menu">
                    <li><span className="dropdown-item-text text-muted small">
                      Role: <strong className="text-capitalize">{user.role}</strong>
                    </span></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item text-danger" onClick={handleLogout}>
                        🚪 Logout
                      </button>
                    </li>
                  </ul>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item"><NavLink to="/login"    className="nav-link">Login</NavLink></li>
                <li className="nav-item"><NavLink to="/register" className="nav-link">Register</NavLink></li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
