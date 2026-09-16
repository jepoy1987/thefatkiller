import type { Metadata } from 'next';
import { ArrowUpRight } from '../../components/icons';

export const metadata: Metadata = { title: 'Contact', description: 'Contact The Fat Killer team for product help or general questions.' };

export default function ContactPage() {
  return <main id="main-content"><section className="page-hero"><div className="container page-hero__grid"><div><p className="eyebrow">Contact</p><h1>Let’s get you to the right <em>place.</em></h1></div><p>Questions about your account, the product, or a potential partnership? Send us a note and include enough context for us to help.</p></div></section><section className="section"><div className="container contact-grid"><a href="mailto:support@thefatkiller.com"><span>Product & account help</span><h2>support@thefatkiller.com</h2><p>For using TFK, account access, and plan questions.</p><ArrowUpRight /></a><a href="mailto:hello@thefatkiller.com"><span>General enquiries</span><h2>hello@thefatkiller.com</h2><p>For company, press, and partnership conversations.</p><ArrowUpRight /></a></div></section></main>;
}
