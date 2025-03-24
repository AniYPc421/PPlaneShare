export default function getReadableSizeFromBytes(bytes, fixedCount = 2) {
  let numPart = bytes;
  const formats = ["B", "KiB", "MiB", "GiB"];
  for (const format of formats) {
    if (numPart < 1024) {
      const fixedNum = numPart.toFixed(fixedCount);
      return `${fixedNum} ${format}`;
    }
    numPart /= 1024;
  }
  numPart *= 1024;
  const lastFormat = formats[formats.length - 1];
  const fixedNum = numPart.toFixed(fixedCount);
  return `${fixedNum} ${lastFormat}`;
}
