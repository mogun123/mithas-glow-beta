"use client"

import { useState } from "react"
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Send,
  CreditCard,
  History,
  Loader2,
  IndianRupee,
  Gift,
  Percent,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWallet, useWalletTransactions, useAddMoney, useWithdrawMoney } from "@/hooks/use-wallet"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export function WalletScreen() {
  const [addMoneyOpen, setAddMoneyOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const { wallet, isLoading } = useWallet()
  const { transactions, isLoading: txnLoading } = useWalletTransactions()
  const { addMoney, isAdding } = useAddMoney()
  const { withdraw, isWithdrawing } = useWithdrawMoney()

  const balance = wallet?.balance || 2500
  const cashback = wallet?.cashback || 150
  const points = wallet?.points || 250

  const handleAddMoney = async () => {
    if (!amount) return
    await addMoney({ amount: Number.parseFloat(amount), method: "upi" })
    setAddMoneyOpen(false)
    setAmount("")
  }

  const handleWithdraw = async () => {
    if (!amount) return
    await withdraw({ amount: Number.parseFloat(amount), method: "bank" })
    setWithdrawOpen(false)
    setAmount("")
  }

  const quickAmounts = [100, 500, 1000, 2000]

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Wallet</h1>
        <p className="text-muted-foreground text-sm">Manage your balance and transactions</p>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-3xl font-bold flex items-center">
                <IndianRupee className="h-6 w-6" />
                {isLoading ? "-" : balance.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-background/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Gift className="h-3 w-3" />
                <span className="text-xs">Cashback</span>
              </div>
              <p className="font-semibold">INR {cashback}</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Percent className="h-3 w-3" />
                <span className="text-xs">Reward Points</span>
              </div>
              <p className="font-semibold">{points} pts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        {/* Add Money Dialog */}
        <Dialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Money
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Money to Wallet</DialogTitle>
              <DialogDescription>Enter amount to add to your wallet balance</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Amount (INR)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="text-lg"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((amt) => (
                  <Button key={amt} variant="outline" size="sm" onClick={() => setAmount(amt.toString())}>
                    +{amt}
                  </Button>
                ))}
              </div>
              <Button onClick={handleAddMoney} disabled={!amount || isAdding} className="w-full">
                {isAdding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Proceed to Pay
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Withdraw Dialog */}
        <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full bg-transparent">
              <Send className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Withdraw to Bank</DialogTitle>
              <DialogDescription>Transfer money from wallet to your bank account</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Amount (INR)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="text-lg"
                  max={balance}
                />
                <p className="text-xs text-muted-foreground mt-1">Available: INR {balance.toLocaleString()}</p>
              </div>
              <Button onClick={handleWithdraw} disabled={!amount || isWithdrawing} className="w-full">
                {isWithdrawing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Withdraw to Bank
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transactions */}
      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="credit">Credit</TabsTrigger>
          <TabsTrigger value="debit">Debit</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {txnLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                (transactions?.length ? transactions : mockTransactions).map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          txn.type === "credit" ? "bg-green-500/10" : "bg-red-500/10",
                        )}
                      >
                        {txn.type === "credit" ? (
                          <ArrowDownLeft className="h-5 w-5 text-green-500" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{txn.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(txn.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                    <p className={cn("font-semibold", txn.type === "credit" ? "text-green-500" : "text-red-500")}>
                      {txn.type === "credit" ? "+" : "-"}INR {txn.amount.toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              {(transactions?.filter((t) => t.type === "credit") || mockTransactions.filter((t) => t.type === "credit"))
                .length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No credit transactions</p>
              ) : (
                (
                  transactions?.filter((t) => t.type === "credit") ||
                  mockTransactions.filter((t) => t.type === "credit")
                ).map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <ArrowDownLeft className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{txn.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(txn.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-green-500">+INR {txn.amount.toLocaleString()}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debit" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              {(transactions?.filter((t) => t.type === "debit") || mockTransactions.filter((t) => t.type === "debit"))
                .length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No debit transactions</p>
              ) : (
                (
                  transactions?.filter((t) => t.type === "debit") || mockTransactions.filter((t) => t.type === "debit")
                ).map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                        <ArrowUpRight className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{txn.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(txn.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-red-500">-INR {txn.amount.toLocaleString()}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Offers Section */}
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Gift className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">Add INR 500 or more</p>
              <p className="text-sm text-muted-foreground">Get 5% cashback on your next order</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Mock transactions
const mockTransactions = [
  { id: "1", type: "credit", description: "Added to wallet", amount: 1000, created_at: new Date().toISOString() },
  {
    id: "2",
    type: "debit",
    description: "Order #ABC123",
    amount: 450,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "3",
    type: "credit",
    description: "Cashback reward",
    amount: 50,
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "4",
    type: "debit",
    description: "Order #XYZ789",
    amount: 1200,
    created_at: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: "5",
    type: "credit",
    description: "Refund - Order #DEF456",
    amount: 300,
    created_at: new Date(Date.now() - 345600000).toISOString(),
  },
]
