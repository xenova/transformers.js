function formatBytes(bytes, decimals = 0) {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Bytes";
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1000)), 10);
    const rounded = (bytes / Math.pow(1000, i)).toFixed(decimals);
    return rounded + " " + sizes[i];
}

export default function Progress({ data }) {
    const progress = data.progress ?? 0;
    const text = data.file;

    const a = formatBytes(data.loaded);
    const b = formatBytes(data.total);
    return (
        <div className="progress-container">
            <div className='progress-bar' style={{ 'width': `${progress}%` }}>{text} ({`${a} / ${b}`})</div>
        </div>
    );
}