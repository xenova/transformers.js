const COLOURS = [
    'bg-purple-300',
    'bg-green-300',
    'bg-yellow-300',
    'bg-red-300',
    'bg-blue-300',
]

export function Token({text, position}){
    const isNormal = text !== '\n'

    return (
        isNormal ? (
        <span className={`leading-5 inline-block ${COLOURS[position % COLOURS.length]}`}>
            {text}
        </span>) : <br/>
    )
}