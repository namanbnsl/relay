export default function Link({ children, href, ...props }) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
