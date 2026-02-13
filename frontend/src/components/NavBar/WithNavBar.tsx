import { Outlet } from 'react-router-dom'
import NavBar from './NavBar'

function WithNavBar() {
  return (
    <>
      <NavBar />
      <div className="mt-7">
        <Outlet />
      </div>
    </>
  )
}

export default WithNavBar
