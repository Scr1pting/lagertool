import { Outlet } from 'react-router-dom';
import NavBar from './NavBar/NavBar';

function WithNavLayout() {
  return (
    <>
      <NavBar />
      <div style={{"marginTop": "70px"}}>
        <Outlet />
      </div>
    </>
  );
}

export default WithNavLayout;
