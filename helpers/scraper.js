let fetch = require('node-fetch');
let $ = require('cheerio');
let h2p = require('html2plaintext');

const BLOODWORKS_SCHEDULE_URL = 'https://schedule.bloodworksnw.org/DonorPortal/Schedule/SiteSearch.aspx?SearchType=Distance&PostalCode=';

/**
 * Returns the HTML for a given web page
 * 
 * @param {String} url 
 */
async function getHtml(url) {
  let res = await fetch(url);
  if (res.status === 200) {
    return res.text();
  } else {
    return null;
  }
}

/**
 * Web scrapes the times from the DB
 * 
 * @param {String} zipcode - zip code
 */
async function getTimes(zipcode) {
  let html = await getHtml(`${BLOODWORKS_SCHEDULE_URL}${zipcode}`);

  if (!html) {
    return new Error(`Unable to retrieve html from ${BLOODWORKS_SCHEDULE_URL}${zipcode}`);
  }

  let results = [];
  for (var i = 0; i < 2; i++) {
    let obj = {};
    obj.name = $(`#ctl00_Main_rgSiteSearch_ctl00__${i} td:nth-child(2)`, html).text();

    let address = $(`#ctl00_Main_rgSiteSearch_ctl00__${i} td:nth-child(3)`, html).html();
    address = address.split('<br>').map((v) => {
      return v.trim();
    });
    // Removes the last element (we don't need it)
    address.pop();
    obj.address = address.join(' ');

    obj.distance = $(`#ctl00_Main_rgSiteSearch_ctl00__${i} td:nth-child(4)`, html).text().trim();

    let date = $(`#ctl00_Main_rgSiteSearch_ctl00__${i} td:nth-child(5)`, html).html();
    date = date.split('<br>').map((v) => {
      return v.trim();
    });
    obj.date = h2p(date).replace(',', ' ');

    let donationType = $(`#ctl00_Main_rgSiteSearch_ctl00__${i} td:nth-child(6)`, html).html();
    donationType = donationType.split('<br>').map((v) => {
      return v.trim();
    });
    donationType = (h2p(donationType) + '').toString().split(',');
    donationType.pop();
    obj.donationType = donationType.join(', ');

    results.push(obj);
  }
  let formattedResults = '';
  Object.keys(results).forEach((drive) => {
    formattedResults += `${drive.name}\n`;
    formattedResults += `${drive.address}\n`;
    formattedResults += `${drive.distance}\n`;
    formattedResults += `Donation type: ${drive.donationType}\n`;
  })
  console.log(formattedResults);
  return results;
}

module.exports = {
  getTimes: getTimes
}