export function useRouter() {
  return {
    push: (url) => {
      window.location.href = url;
    },
  };
}
