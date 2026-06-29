export const Logo = (sizeParam: string) => {
  let size = "10";
  switch (sizeParam) {
    case "sm":
      size = "10";
      break;

    case "md":
      size = "14";
      break;

    case "lg":
      size = "18";
      break;

    default:
      size = "10";
      break;
  }
  return (
    <div
      className={`w-${size} h-${size} rounded-[22px] overflow-hidden flex items-center justify-center flex-shrink-0`}
    >
      <img
        src="/logo"
        alt="logo"
        className="w-full h-full  object-cover text-primary-foreground"
      />
    </div>
  );
};
