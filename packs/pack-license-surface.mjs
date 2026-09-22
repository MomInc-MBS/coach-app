import {productionCatalogKeyring} from './catalog-config.mjs';
import {aggregateCatalogLicenses,readLastGoodCatalog} from './catalog-state.mjs';

export async function mountPackLicenses({host,storage=globalThis.localStorage,keyring=productionCatalogKeyring()}={}){
 if(!host)return null;host.replaceChildren();
 const catalog=await readLastGoodCatalog({storage,keyring});
 const records=catalog?aggregateCatalogLicenses(catalog):[];
 if(!records.length){host.textContent='No optional pack licenses are installed.';return {catalog:null,records};}
 const list=host.ownerDocument.createElement('ul');
 for(const record of records){const item=host.ownerDocument.createElement('li'),link=host.ownerDocument.createElement('a'),copy=host.ownerDocument.createElement('span');link.href=record.sourceUrl;link.rel='noreferrer';link.textContent=record.name+' '+record.version+' ('+record.spdx+')';copy.textContent=' — '+record.attribution;item.append(link,copy);list.append(item);}
 host.append(list);return {catalog,records};
}
