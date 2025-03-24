import debugCreator from "debug";

export default function create(namespace) {
  return debugCreator(`PPlaneShare:${namespace}`);
}
