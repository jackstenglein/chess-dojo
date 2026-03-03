interface CoachProps {
    src?: string;
}

const defaultSrc = 'https://www.chess.com/chess-themes/pieces/bases/150/wn.png';

const Coach: React.FC<CoachProps> = ({ src }) => {
    return (
        <img
            data-testid='coach-image'
            src={src || defaultSrc}
            style={{
                maxHeight: '120px',
                marginLeft: '1em',
            }}
            alt='coach logo'
            crossOrigin='anonymous'
        />
    );
};

export default Coach;
