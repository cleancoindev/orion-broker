type Field = string | number;

export const sortByField = (fieldA: Field, fieldB: Field, isAsc: boolean) => {
    if (fieldA < fieldB) {
        return isAsc ? -1 : 1;
    } else if (fieldA > fieldB) {
        return isAsc ? 1 : -1;
    }

    return 0;
}
