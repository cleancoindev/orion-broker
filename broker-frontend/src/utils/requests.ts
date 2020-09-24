export function debounce (callback: () => void, ms: number) {
    let isCooldown = false;

    return function () {
        if (isCooldown) return;

        // @ts-ignore
        callback();
        isCooldown = true;

        setTimeout(() => isCooldown = false, ms);
    }
}
