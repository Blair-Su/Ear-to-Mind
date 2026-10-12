import { landingMarkup } from "./landing";
export default function Home(){return <><link rel="stylesheet" href="/marketing/styles.css"/><div dangerouslySetInnerHTML={{__html:landingMarkup}}/><script type="module" src="/marketing/app.js"/></>;}
