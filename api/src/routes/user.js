const server = require("express").Router();
const { User, Order, Product, Linea_Order } = require("../db.js");

//Agregar un usuario
server.post("/", (req, res, next) => {
    const { name, email, address, phoneNumber, password, image, location_id } = req.body;
    if (!name || !email || !address || !password || !image )
        return res.status(400).json({ message: "A parameter is missing" });

    User.create({
        name,
        email,
        address,
        phoneNumber,
        password,
        image,
        location_id
    })
        .then((user) => {
            return res.status(200).json(user);
        })
        .catch((error)=>{
            console.log('h');
        });
});

//Actualizar un usuario
server.put("/:id", (req, res, next) => {
    let { id } = req.params;
    let update = req.body;

    User.findOne({ where: { id } })
        .then((user) => {
            if (!user) return res.status(404).json({ message: "User doesnt exist" });

            user.update(update).then((userUpdate) => {
                return res.status(200).json(userUpdate);
            });
        })
        .catch((error)=>{
            console.log('h');
        });
});

//Eliminar un usuario
server.delete("/:id", (req, res, next) => {
    let { id } = req.params;

    User.findOne({ where: { id } })
        .then((user) => {
            if (!user)
                return res.status(404).json({ message: "User doesnt exist" });

            user.destroy(user).then(() => {
                return res.status(200).json({ message: "User deleted" });
            });
        })
        .catch(next);
});

//obtener todos los usuarios
server.get("/", (req, res) => {
    User.findAll({
        order: [["id", "ASC"]],
        attributes: [
            "id",
            "name",
            "email",
            "address",
            "role",
            "phoneNumber",
        ],
    })
        .then((users) => {
            return res.send({ data: users });
        })
        .catch((err) => {
            return res.sendStatus(500);
        });
});

//obtener todas las ordenes de un usuario en especifico
server.get("/:id/orders", (req, res) => {
    const id = req.params.id;

    User.findByPk(id, {
        include: {
            model: Order,
            through: { attributes: ["total", "quantity"] },
        },
    })
        .then((user) => {
            return res.send({ data: user.orders }).status(200);
        })
        .catch((err) => {
            return res.sendStatus(500);
        });
});

//obtener todas las ordenes de todos los usuario
server.get("/orders", (req, res) => {
    const userId = req.userId;
    Order.findAll({
        include: [User, { model: Product, through: Linea_Order }],
        where: {
            userId: userId,
            status: {
                [Op.ne]: "shopping_cart",
            },
        },
    })
        .then((orders) => {
            return res.send({ data: orders });
        })
        .catch((err) => {
            return res.sendStatus(500);
        });
});

//agregar un producto al carrito
server.post("/userId/cart", (req, res) => {
    const userId = req.params.userId;
    const { productId, quantity } = req.body;

    Order.findOne({
        where: {
            userId: userId,
            status: "shopping_cart",
        },
    })
        .then((order) => {
            const orderId = order.id;

            Product.findOne({
                where: {
                    id: productId,
                },
            })
                .then((product) => {
                    if (quantity > product.stock) {
                        return res.send("Invalid Operation");
                    }
                    Linea_Order.create({
                        quantity: quantity,
                        total: product.price,
                        productId: productId,
                        orderId: orderId,
                        userId: userId,
                    })
                        .then((orderCreated) => {
                            return res.send(orderCreated).sendStatus(201);
                        })
                        .catch((err) => {
                            return res.sendStatus(500);
                        });
                });
        });
});

//Obtenes todos los productos que estan en el carrito de un usuario en especifico
server.get("/userId/cart", (req, res) => {
    const idUser = req.params.userId;
    Order.findOne({
        include: [User, { model: Product, through: Linea_Order }],
        where: {
            userId: idUser,
            status: "shopping_cart",
        },
    })
        .then((order) => {
            if (!order) {
                return res.send({ data: { products: [] } }).status(204);
            }
            return res.send({ data: order });
        })
        .catch((err) => {
            return res.sendStatus(500);
        });
});

//modificamos la cantidad de un producto en especifico, que se encuentre en el carrito
server.put("/userId/cart/:productId", async (req, res) => {
    const userId = req.params.userId;
    const productId = req.params.productId;
    const quantity = req.body.quantity;

    let product = await Product.findByPk(productId);

    if (product.stock < quantity)
        return res.sendStatus(422);

    Orderline.findOne({
        include: [{ model: Order }],
        where: {
            userId: userId,
            productId: productId,
            "$order.status$": "shopping_cart",
        },
    })
        .then(async (orderline) => {
            if (!orderline)
                return res.sendStatus(404);

            orderline.quantity = quantity;
            await orderline.save();
            return res.send({ data: orderline });
        })
        .catch((err) => {
            console.log(err);
            return res.sendStatus(500);
        });
});

//Eliminar un producto del carrito de un usuario en especifico
server.delete("/userId/cart/:productId", (req, res) => {
    const userId = req.params.userId;
    const productId = req.params.productId;

    Linea_Order.findOne({
        include: [
            {
                model: Order,
            },
        ],
        where: {
            "$order.userId$": userId,
            "$order.status$": "shopping_cart",
            productId: productId,
        },
    })
        .then(async (orderline) => {
            if (!orderline) {
                return res.sendStatus(404);
            }

            await orderline.destroy();

            let _orderline = await Linea_Order.findOne({
                where: {
                    orderId: orderline.orderId,
                },
            });
            if (!_orderline)
                await Order.destroy({
                    where: {
                        id: orderline.orderId,
                    },
                });

            return res.sendStatus(204);
        })
        .catch((err) => {
            return res.sendStatus(500);
        });
});

//vacia el carrito
server.delete("/:userId/cart", (req, res) => {
    const userId = req.params.userId;

    Order.findOne({
        where: {
            userId: userId,
            status: "shopping_cart",
        },
    })
        .then(async (order) => {
            if (!order) return res.sendStatus(404);
            await order.destroy();
            return res.sendStatus(204);
        })
        .catch((err) => {
            return res.sendStatus(500);
        });
});

//obtener el carrito del usuario
server.get("/:idUser/cart", (req, res) => {
    const idUser = req.params.idUser;

    Order.findOne({
        include: [User, { model: Product, through: Linea_Order }],
        where: {
            userId: idUser,
            status: "shopping_cart",
        },
    })
        .then((order) => {
            if (!order) {
                return res.sendStatus(404);
            }
            return res.send({ data: order });
        })
        .catch((err) => {
            return res.sendStatus(500);
        });
});

module.exports = server;
