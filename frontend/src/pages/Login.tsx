import { Button } from "@/components/shadcn/button";

function Login() {
  return <>
    <main className="flex flex-col items-center justify-center h-[calc(100vh-180px)] gap-4 pt-[100px]">
      <header>
        <h1 className="text-3xl font-semibold">Welcome to Lagertool</h1>
      </header>
      <Button>
        Login with Switch_edu
      </Button>
    </main>
  </>
}

export default Login;
