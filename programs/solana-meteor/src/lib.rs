use anchor_lang::prelude::*;

// Use the ID Anchor gave you
declare_id!("Du87mHpffVDp6XwQKC8N2uJXPFARtMKUUty8qt5Qk1Jk");

#[program]
pub mod solana_meteor {
    use super::*;

    /// Initializes a new MeteorPool with a given activation timestamp.
    pub fn init_pool(ctx: Context<InitPool>, activation_point: i64) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.activation_point = activation_point;
        pool.is_active = false;
        Ok(())
    }

    /// Activates the pool if current clock >= activation_point.
    pub fn activate(ctx: Context<Activate>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let clock = Clock::get()?;
        if clock.unix_timestamp >= pool.activation_point {
            pool.is_active = true;
            Ok(())
        } else {
            err!(ErrorCode::NotActivatedYet)
        }
    }

    /// Sets a simulated timestamp for testing
    pub fn set_simulated_time(ctx: Context<SetSimulatedTime>, simulated_timestamp: i64) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.simulated_timestamp = Some(simulated_timestamp);
        Ok(())
    }

     /// Activates the pool using either real or simulated time
     pub fn activate_with_simulation(ctx: Context<Activate>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        
        // Use simulated time if available, otherwise real clock
        let current_time = match pool.simulated_timestamp {
            Some(time) => time,
            None => Clock::get()?.unix_timestamp,
        };
        
        if current_time >= pool.activation_point {
            pool.is_active = true;
            Ok(())
        } else {
            err!(ErrorCode::NotActivatedYet)
        }
    }
}

#[derive(Accounts)]
pub struct InitPool<'info> {
    #[account(init, payer = user, space = 8 + 16)]
    pub pool: Account<'info, MeteorPool>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Activate<'info> {
    #[account(mut)]
    pub pool: Account<'info, MeteorPool>,
}

#[derive(Accounts)]
pub struct SetSimulatedTime<'info> {
    #[account(mut)]
    pub pool: Account<'info, MeteorPool>,
}

#[account]
pub struct MeteorPool {
    pub activation_point: i64,
    pub is_active: bool,
    pub simulated_timestamp: Option<i64>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Pool is not activated yet")]
    NotActivatedYet,
}
