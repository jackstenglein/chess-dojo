import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import Avatar from '@/profile/Avatar';
import SendIcon from '@mui/icons-material/Send';
import { CircularProgress, IconButton, Stack, TextField, Tooltip } from '@mui/material';
import { AxiosResponse } from 'axios';
import { useState } from 'react';

interface CommentEditorProps<T, CreateFunctionProps> {
    createFunctionProps: CreateFunctionProps;
    createFunction: (props: CreateFunctionProps, content: string) => Promise<AxiosResponse<T>>;
    onSuccess: (item: T) => void;
    label?: string;
    tooltip?: string;
}

function CommentEditor<T, CreateFunctionProps>(props: CommentEditorProps<T, CreateFunctionProps>) {
    const { createFunctionProps, createFunction, onSuccess, label, tooltip } = props;

    const { user } = useAuth();
    const [comment, setComment] = useState('');
    const request = useRequest();

    const onSubmit = () => {
        const content = comment.trim();
        if (content.length === 0) {
            return;
        }

        request.onStart();
        createFunction(createFunctionProps, content)
            .then((resp) => {
                setComment('');
                onSuccess(resp.data);
                request.onSuccess();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Stack direction='row' spacing={1} alignItems='start' width={1}>
            <RequestSnackbar request={request} />

            <Avatar user={user} size={40} />
            <TextField
                label={label || 'Add a comment...'}
                fullWidth
                multiline
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                slotProps={{ htmlInput: { maxLength: 10000 } }}
            />

            {request.isLoading() ? (
                <div style={{ alignSelf: 'end' }}>
                    <CircularProgress size={40} />
                </div>
            ) : (
                <Tooltip title={tooltip || 'Post Comment'}>
                    <div style={{ alignSelf: 'end' }}>
                        <IconButton
                            onClick={onSubmit}
                            disabled={comment.trim() === ''}
                            color='primary'
                        >
                            <SendIcon />
                        </IconButton>
                    </div>
                </Tooltip>
            )}
        </Stack>
    );
}

export default CommentEditor;
