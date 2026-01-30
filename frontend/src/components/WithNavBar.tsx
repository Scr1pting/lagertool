import { Outlet } from 'react-router-dom'
import NavBar from './NavBar/NavBar'

function WithNavLayout() {
  return (
    <>
      <NavBar />
      <div className="mt-7">
        <Outlet />
      </div>
    </>
  )
}

export default WithNavLayout
