import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { CustomTask } from '@/database/requirement';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';

interface DeleteCustomTaskModalProps {
    task: CustomTask;
    open: boolean;
    onCancel: () => void;
    onDelete?: () => void;
}

const DeleteCustomTaskModal: React.FC<DeleteCustomTaskModalProps> = ({
    task,
    open,
    onCancel,
    onDelete,
}) => {
    const { user } = useAuth();
    const api = useApi();
    const request = useRequest();

    if (!user) {
        return null;
    }

    const handleDelete = () => {
        const newTasks = user.customTasks?.filter((t) => t.id !== task.id) || [];

        request.onStart();
        api.updateUser({
            customTasks: newTasks,
        })
            .then(() => {
                trackEvent(EventType.DeleteNondojoTask, {
                    task_id: task.id,
                    task_name: task.name,
                });
                if (onDelete) {
                    onDelete();
                }
                request.onSuccess();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Dialog open={open} onClose={request.isLoading() ? undefined : onCancel} maxWidth='sm'>
            <RequestSnackbar request={request} />

            <DialogTitle>Delete {task.name}?</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    This custom task will be removed from your profile, and all time logged will be
                    lost. This action is irreverisble.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} disabled={request.isLoading()}>
                    Cancel
                </Button>

                <Button color='error' loading={request.isLoading()} onClick={handleDelete}>
                    Delete Task
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteCustomTaskModal;
