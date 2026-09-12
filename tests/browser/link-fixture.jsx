export default function Link({
  children,
  href,
  onNavigate,
  prefetch,
  ...props
}) {
  void prefetch;
  return (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
          return;
        event.preventDefault();
        if (onNavigate) onNavigate({ preventDefault() {} });
        else window.history.pushState(null, "", href);
      }}
    >
      {children}
    </a>
  );
}
