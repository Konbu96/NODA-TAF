/** 名前の苗字の部分（空白より前）。空白がなければ名前全体 */
export const familyName = (name: string) => name.trim().split(/[\s　]/)[0];
