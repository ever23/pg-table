const { describe, it } = require('node:test');
const assert= require("assert")
const dbtabla = require('dbtabla')
const connect = require('../pg-table.js')
describe("Test de la clase pg-table",()=>
{
    const pg= new connect(
    {
        host     : 'localhost',
        password:'EVER2310',
        user     : 'postgres',
        database :'test_pg_tab'
    },false)
   
    it('verificacion de metodos',()=>
    {
        assert.equal(typeof pg.tabla,"function")
        assert.equal(typeof pg.query,"function")
        assert.equal(typeof pg.connect,"function")
        assert.equal(typeof pg._keysInTable,"function")
        assert.equal(typeof pg.end,"function")
    })
    
 })
