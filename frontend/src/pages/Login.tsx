import { Button } from "@/components/shadcn/button"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function Login() {
  return <>
    <main className="flex flex-col items-center justify-center h-[calc(100vh-180px)] gap-4 pt-[100px]">
      <header>
        <h1 className="text-3xl font-semibold">Welcome to Lagertool</h1>
      </header>
      <Button onClick={() => { window.location.href = `${API_BASE_URL}/auth/eduid/login` }}>
        Login with Switch_edu
      </Button>
    </main>
  </>
}

export default Login
