import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group"
import { FieldGroup, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { RxCross2 } from "react-icons/rx";


function Form() {
  return(
    <form>
      <FieldGroup className="gap-4">
        <Field>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="building">Building</Label>
            <Input
              id="building"
              defaultValue="CAB"
              className="col-span-2 h-8"
            />
          </div>
        </Field>
        <Field>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="room">Room</Label>
            <Input
              id="building"
              placeholder="Office"
              className="col-span-2 h-8"
            />
          </div>
        </Field>
        <Button className="bg-primary">Submit</Button>
      </FieldGroup>
    </form>
  )
}


type FromLocation = {
  pathname: string;
  search?: string;
  hash?: string;
  state?: unknown;
};

type LocationState = {
  from?: FromLocation;
};

function ActionButtons() {
  const navigate = useNavigate();
  const location = useLocation();
  const makePath = (from: FromLocation) => `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`;

  // Goes to the last page or home.
  // Enables using the browser back btn to return.
  const goBack = () => {
    const fromLocation = (location.state as LocationState | null)?.from;

    if (fromLocation) {
      navigate(makePath(fromLocation), {
        replace: false,
        state: fromLocation.state,
      });
      return;
    }

    navigate("/", { replace: false });
  };

  return(
    <Popover >
      <ButtonGroup className="fixed top-6 right-6 z-20">
        <ButtonGroup>
          <PopoverTrigger asChild>
            {/* Slightly greys out the Next btn when popover is open*/}
            <Button className="bg-primary transition-colors data-[state=open]:bg-primary/80 data-[state=open]:text-primary-foreground data-[state=open]:hover:bg-primary/70">
              Next
            </Button>
          </PopoverTrigger>
        </ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" onClick={goBack}>
            <RxCross2/>
          </Button>
        </ButtonGroup>
      </ButtonGroup>

      <PopoverContent align="end" sideOffset={12} className="w-64">
        <Form />
      </PopoverContent>
    </Popover>
  )
}

export default ActionButtons;
