export const filtrationByString = (searchString: string) => (item: string) => item.toLocaleLowerCase().indexOf(searchString.toLocaleLowerCase()) >= 0;
