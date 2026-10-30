import type {ComponentProps} from 'react';
const base = import.meta.env.BASE_URL;
export const assetPath = (path:string) => `${base}${path.replace(/^\//,'')}`;
export function routePath(path=location.pathname){
  const relative=path.startsWith(base)?path.slice(base.length):path.replace(/^\//,'');
  return `/${relative}`.replace(/\/+$/,'')||'/';
}
export function Link({href,...props}:ComponentProps<'a'>){
  const target=href?.startsWith('/')&&!href.startsWith('//')?assetPath(href):href;
  return <a href={target} {...props}/>;
}
