import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from "@/components/shadcn/button";
import { type ShelfColumn } from '../../../types/shelf';
import { X } from 'lucide-react';
import AddShelfDialog from './AddShelfForm';
import { Dialog, DialogContent, DialogHeader } from '@/components/shadcn/dialog';
import { DialogTitle, DialogTrigger } from '@radix-ui/react-dialog';
import AddShelfForm from './AddShelfForm';


type FromLocation = {
  pathname: string;
  search?: string;
  hash?: string;
  state?: unknown;
};

type LocationState = {
  from?: FromLocation;
};

function AddShelfButtons({ columns }: { columns: ShelfColumn[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const makePath = (from: FromLocation) => `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`;

  // Goes to the last page or home.
  // Enables using the browser back btn to return to ShelfBuilder.
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
    <div className="fixed top-6 right-6 z-20 gap-2">
      <Dialog>
        <DialogTrigger>
          <Button>
            Next
          </Button>
        </DialogTrigger>

        <AddShelfForm columns={columns} />
      </Dialog>
      <Button variant="outline" onClick={goBack}>
        <X />
      </Button>
    </div>
  )
}

export default AddShelfButtons;
