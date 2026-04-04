const { describe, it } = require('node:test');
const assert= require("assert")
const dbtabla = require("dbtabla")
const connect = require('../pg-table.js')
const pgResult = require("../lib/pgResult")
const { dbRow } = require("dbtabla")
const path = require('path')
function createAndInsert(callback)
{

    return (new Promise((resolve,reject)=>
    {
        const pg= new connect({
                host     : 'localhost',
                password:'EVER2310',
                user     : 'postgres',
                database :'test_pg_tab'
            })
        let test1=pg.tabla('test1')
        test1.insert(null,"text",12,"text2").then(ok=>
        {
            callback(resolve,reject,pg,ok)
        }).catch(e=>
        {
            pg.end()
            reject(e)
        })

    }))
}
describe("Test de la clase pg-table :tabla",()=>
{
    it('obtencion del objeto dbtabla',()=>
    {
        return (new Promise((resolve,rejec)=>
        {
            const pg= new connect(//"pgsql:host=localhost;port=5432;dbname=test_pg_tab;user=postgres;password:EVER2310;"
            {
                host     : 'localhost',
                password:'EVER2310',
                user     : 'postgres',
                database :'test_pg_tab'
            })
            pg.end()
            resolve(pg.tabla('test1'))


        })).then(test1=>
        {
            assert.ok(test1 instanceof dbtabla,"debe retornar un objeto dbtabla")
        })
    })
    it('obtencion del objeto dbtabla async',()=>
    {

        return (new Promise((resolve,reject)=>
        {
            const pg= new connect({
                host     : 'localhost',
                password:'EVER2310',
                user     : 'postgres',
                database :'test_pg_tab'
            })
            pg.query("create table IF NOT EXISTS \"test1\" (\"id\" serial not null ,\"row1\" text default 'ever',\"row2\" int not null,\"row3\" text null,primary key (\"id\"))")
                .then(ok=>
                {
                    pg.tabla('test1',(test1,err)=>
                    {
                        if(test1)
                        {
                            pg.end()
                            resolve(test1)
                        }else
                        {
                            pg.end()
                            reject(err)
                        }
                        
                    },true)
                }).catch(e=>{
                    pg.end()
                    reject(e)
                })

        })).then(test1=>
        {
            assert.ok((test1 instanceof dbtabla),"debe retornar un objeto dbtabla")
        })
    })
    it('dbTabla:insert',()=>
    {
        return (new Promise((resolve,reject)=>
        {
            const pg= new connect({
                host     : 'localhost',
                password:'EVER2310',
                user     : 'postgres',
                database :'test_pg_tab'
            })
            let test1=pg.tabla('test1')
           
            test1.insert(null,"text",12,"text2").then(ok=>
            {
                pg.end()
                resolve(ok)
            }).catch(e=>
            {
                pg.end()
                reject(e)
            })

        })).then(ok=>
        {

            assert.ok(typeof ok==="object","debe retornar un objeto")
            assert.equal(ok.$sql,"INSERT INTO \"test1\" (\"row1\",\"row2\",\"row3\") VALUES ('text',12,'text2');")

        })
    })
    it('dbTabla:select',()=>
    {
        return createAndInsert((resolve,reject,pg,ok)=>
            {

                let test1=pg.tabla('test1')
                test1.select("order by id desc").then(d=>
                    {
                        pg.end()
                        resolve(d)
                    }).catch(e=>
                    {
                        pg.end()
                        reject(e)
                    })
            }).then(data=>
            {
                assert.ok(data instanceof pgResult,"debe retornar un objeto pgResult")
                assert.equal(data.$sql,"SELECT \"test1\".* FROM \"test1\" ORDER BY id desc;")
                assert.ok(data.length>0)
                assert.ok(data[0] instanceof dbRow,"debe retornar un objeto dbRow")
                assert.equal(data[0].row1,"text")
                assert.equal(data[0].row2,12)
                assert.equal(data[0].row3,"text2")

            })

    })
    it('dbTabla:update',()=>
    {
        let id
        return createAndInsert((resolve,reject,pg,ok)=>
            {
                //console.log(ok)
                let test1=pg.tabla('test1')

                test1.update({row1:"hola"},{row2:12}).then(d=>
                    {
                        pg.end()
                        resolve(d)
                    }).catch(e=>
                    {
                        pg.end()
                        reject(e)
                    })
            }).then(data=>
            {
                assert.ok(typeof data==="object","debe retornar un objeto")
                assert.equal(data.$sql,"UPDATE \"test1\" SET \"row1\"='hola' WHERE \"row2\"=12;")

            })
    })
    it('dbTabla:delete',()=>
    {
        let id
        return createAndInsert((resolve,reject,pg,ok)=>
            {
                let test1=pg.tabla('test1')

                test1.delete({row2:12}).then(d=>
                    {
                        pg.end()
                        resolve(d)
                    }).catch(e=>
                    {
                        pg.end()
                        reject(e)
                    })
            }).then(data=>
            {
                assert.ok(typeof data==="object","debe retornar un objeto")
                assert.equal(data.$sql,"DELETE FROM \"test1\" WHERE \"row2\"=12;")
            })

    })
    it('load model test3',()=>
    {
        return (new Promise((resolve,reject)=>
        {
            const pg= new connect({
                host     : 'localhost',
                password:'EVER2310',
                user     : 'postgres',
                database :'test_pg_tab'
            })
            pg.pathModels(path.dirname(__filename)+"/modelo")
            pg.query("drop table if exists test3;drop table if exists test4;")
                .then(d=>
                {
                    
                    pg.tabla('test3',(tab,e)=>
                    {
                        if(tab===null)
                        {
                            pg.end()
                            reject(e)
                        }
                        else
                        resolve(tab)
                    },true)
                  
                }).catch(reject)
        })).then(test3=>
        {
            assert.ok(test3 instanceof dbtabla,"debe retornar un objeto dbtabla")
            return test3.select().then(d=>
            {
                test3._connection.end()
                assert.ok(d instanceof Array,"se debe obtener un array")
            })

        })
    })
    it('load model test4',()=>
    {
        return (new Promise((resolve,reject)=>
        {
            const pg= new connect({
                host     : 'localhost',
                password:'EVER2310',
                user     : 'postgres',
                database :'test_pg_tab'
            })
            pg.pathModels(path.dirname(__filename)+"/modelo")

            
            pg.tabla('test4',(tab,e)=>
            {
                
                if(tab===null)
                {
                    pg.end()
                    reject(e)
                }
                else
                    resolve(tab)
            },true)
        })).then(test4=>
        {
            assert.ok(test4 instanceof dbtabla,"debe retornar un objeto dbtabla")
            return test4.select().then(d=>
            {
                test4._connection.end()
                assert.ok(d instanceof Array,"se debe obtener un array")
            })

        })
    })
})
