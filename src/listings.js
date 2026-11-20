import { homes } from '../model.js';

export const housingNeeds = {
  quiet:'Quiet study space', furnished:'Furnished', pets:'Cats allowed',
  laundry:'In-unit laundry', parking:'Parking available', private:'Private unit'
};
const neighborhoods = {
  central:['Central Campus','a'], north:['North Campus','b'], market:['Kerrytown','c'],
  west:['Old West Side','c'], south:['South University','a'], burns:['Burns Park','a'],
  fuller:['Fuller Road','b'], downtown:['Downtown','c']
};
// Rent and utilities represent one student's share. All listing data is fictional.
const extraHomes = [
  ['Oak & Hill','south','Private room',875,75,[12,47,30],['furnished','laundry']],
  ['Packard Porch','burns','Private room',770,85,[20,53,35],['quiet','parking']],
  ['The Linden','south','Studio',1110,85,[11,45,29],['private','quiet','laundry']],
  ['East Quad Court','south','Private room',950,95,[7,42,24],['furnished','laundry','parking']],
  ['Arbor Avenue House','burns','Private room',820,90,[20,55,36],['pets','parking','quiet']],
  ['The Tappan','central','Studio',1210,90,[6,41,20],['private','furnished','laundry']],
  ['Jefferson Row','central','Private room',880,65,[10,46,18],['furnished','pets']],
  ['Liberty House','downtown','Studio',1150,85,[15,43,12],['private','pets','laundry']],
  ['Fourth & Washington','downtown','Private room',840,80,[18,46,8],['furnished','laundry']],
  ['The Observatory','central','Studio',1175,75,[13,31,25],['private','quiet','parking']],
  ['Miller Commons','west','Private room',735,95,[28,50,18],['quiet','parking','pets']],
  ['West Park Cottage','west','One bedroom',1220,100,[27,53,16],['private','pets','quiet','parking']],
  ['Washington Heights','fuller','Private room',865,100,[22,24,28],['quiet','furnished']],
  ['Fuller Crossing','fuller','Studio',1080,80,[26,17,32],['private','laundry','parking']],
  ['Plymouth Place','north','Private room',780,75,[54,14,43],['quiet','furnished','parking']],
  ['Murfin House','north','Studio',1060,90,[46,8,39],['private','quiet','laundry']],
  ['Barton Landing','north','Private room',805,75,[46,18,32],['pets','parking']],
  ['Broadway Terrace','fuller','One bedroom',1265,95,[30,21,16],['private','pets','laundry']],
  ['Catherine Court','market','Studio',1020,85,[20,34,7],['private','quiet','furnished']],
  ['Kingsley Carriage House','market','One bedroom',1325,95,[24,42,7],['private','quiet','pets','parking']],
  ['The Farmers Row','market','Private room',895,90,[21,39,5],['furnished','pets','laundry']]
];
const demoFeatures = [['private','laundry'],['quiet','parking','furnished'],['pets','laundry','furnished']];
export const discoveryHomes = [
  ...homes.map((home,index) => ({...home,features:demoFeatures[index]})),
  ...extraHomes.map(([name,neighborhood,type,rent,utilities,minutes,features],index) => {
    const [area,transitArea] = neighborhoods[neighborhood];
    const study = homes[(index+1)%homes.length];
    return {id:'listing-'+index,name,area,type,rent,utilities,minutes,features,transitArea,
      stopOffset:index%7-2,form:study.form,palette:study.palette,color:study.color};
  })
];
